import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { jotaiUserDataAtom } from '../components/common/Header';
import { useAtom } from 'jotai';

import { supabase } from '../services/supabase/supabase';
import { useQueryClient } from '@tanstack/react-query';

import { handleImageChange } from '../components/posts/HandleImage';
import UserPosts from '../components/mypage/UserPosts';
import { userAtom, userEmailAtom } from '../components/user/login/Login';

const EditProfile = () => {
  const [user] = useAtom(userAtom);
  const [isEditing, setIsEditing] = useState(false);
  const [editnickname, setEditNickName] = useState('');
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const queryClient = useQueryClient();
  const [userEmail] = useAtom(userEmailAtom);
  const [jotaiUserData, setJotaiUserData] = useAtom(jotaiUserDataAtom);

  // 생성한 토큰 가져와서 새로고침 방지
  useEffect(() => {
    const storedUserData = localStorage.getItem('jotaiUserData');
    if (storedUserData) {
      const parsedUserData = JSON.parse(storedUserData);
      setJotaiUserData(parsedUserData);

      queryClient.invalidateQueries(['users', userEmail]);
    }
  }, []);

  const handleEditClick = () => {
    setEditNickName(jotaiUserData?.nickname || '');
    setIsEditing(true);
  };

  const handleNicknameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setEditNickName(event.target.value);
  };

  const handleEdit = async () => {
    let profileimg: string | null = null;

    if (jotaiUserData?.profileimg && Array.isArray(jotaiUserData.profileimg)) {
      profileimg = jotaiUserData.profileimg.join(';');
    }

    if (selectedImages.length > 0) {
      const newImageUrls: string[] = [];

      for (const selectedImage of selectedImages) {
        const { data, error } = await supabase.storage
          .from('1st')
          .upload(`images/${selectedImage.name}`, selectedImage);

        if (error) {
          console.error('Error uploading image to Supabase storage:', error);
          alert('이미지 업로드 중 에러가 발생했습니다!');
          return;
        }

        newImageUrls.push(data.path);
      }

      if (profileimg === null) {
        profileimg = newImageUrls.join(';');
      } else {
        profileimg += ';' + newImageUrls.join(';');
      }
    }

    if (editnickname) {
      const { error } = await supabase
        .from('users')
        .update({
          nickname: editnickname,
          profileimg
        })
        .eq('uid', jotaiUserData?.uid);

      if (error) {
        console.error('Error editing post:', error);
        alert('에러가 발생했습니다!');
      } else {
        alert('수정이 완료되었습니다.');

        // 수정된 데이터를 다시 가져와서 스토리지에 저장
        const { data, error: fetchError } = await supabase
          .from('users')
          .select()
          .eq('uid', jotaiUserData?.uid)
          .single();

        if (fetchError) {
          console.error('Error fetching updated user data:', fetchError);
        } else {
          localStorage.setItem('jotaiUserData', JSON.stringify(data));
          setJotaiUserData(data);
        }
      }
    }
  };

  const handleImageChangeWrapper = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;

    if (selectedFiles) {
      const updatedSelectedImages = handleImageChange(selectedFiles);
      setSelectedImages(updatedSelectedImages);
    }
  };

  const closeBtn = () => {
    setEditNickName('');
    setSelectedImages([]);
    setIsEditing(false);
  };

  return (
    <div>
      <Link to="/">Home</Link>
      {user || jotaiUserData ? (
        <div>
          <h1>마이 페이지</h1>
          <div>
            <img
              src={
                jotaiUserData?.profileimg
                  ? `${process.env.REACT_APP_SUPABASE_STORAGE_URL}${jotaiUserData?.profileimg}`
                  : '-'
              }
              alt={`프로필 이미지 - ${user?.uid}`}
              style={{
                width: 200,
                height: 200,
                borderRadius: 70,
                border: '3px solid black'
              }}
            />

            <button className="material-symbols-outlined" onClick={handleEditClick}>
              edit
            </button>

            <p>이메일: {jotaiUserData ? jotaiUserData.email : ''}</p>
            <p>닉네임: {jotaiUserData ? jotaiUserData.nickname : ''}</p>
          </div>
          {isEditing && (
            <div>
              <input type="text" value={editnickname} onChange={handleNicknameChange} />
              <input type="file" accept="image/*" onChange={handleImageChangeWrapper} />
              <button onClick={closeBtn}>X</button>
              <button onClick={handleEdit}>수정하기</button>
            </div>
          )}
          <UserPosts />
        </div>
      ) : (
        <div>
          <h1>마이 페이지</h1>
          <p>Loading user data...</p>
        </div>
      )}
    </div>
  );
};

export default EditProfile;
